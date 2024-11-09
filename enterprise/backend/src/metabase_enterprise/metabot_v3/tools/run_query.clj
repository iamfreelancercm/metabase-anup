(ns metabase-enterprise.metabot-v3.tools.run-query
  (:require
   [clojure.string :as str]
   [medley.core :as m]
   [metabase-enterprise.metabot-v3.tools.interface :as metabot-v3.tools.interface]
   [metabase.lib.core :as lib]
   [metabase.lib.metadata.jvm :as lib.metadata.jvm]
   [metabase.lib.query :as lib.query]
   [metabase.util.malli :as mu])
  (:import
    (clojure.lang ExceptionInfo)))

(defmulti apply-step
  "Applies a query step."
  {:arglists '([query step])}
  (fn [_query step]
    (-> step :type keyword)))

(defn- column-display-name
  [query column]
  (:long-display-name (lib/display-info query column)))

(defmethod apply-step :aggregation
  [query {operator-name :operator, column-name :column}]
  (let [operators (lib/available-aggregation-operators query)
        operator  (m/find-first #(= (lib/display-name query %) operator-name) operators)]
    (if (some? operator)
      (if (:requires-column? operator)
        (let [columns (lib/aggregation-operator-columns operator)
              column  (m/find-first #(= (column-display-name query %) column-name) columns)]
          (if (some? column)
            (lib/aggregate query (lib/aggregation-clause operator column))
            (throw (ex-info (format "%s is not a correct column for %s operator the aggregate step. Correct column are: %s"
                                    column-name
                                    operator-name
                                    (str/join ", " (map #(column-display-name query %) columns)))
                            {:operator operator-name
                             :column   column-name}))))
        (lib/aggregate query (lib/aggregation-clause operator)))
      (throw (ex-info (format "%s is not a correct operator for the aggregation step. Correct operators are: %s"
                              operator
                              (str/join ", " (map #(lib/display-name query %) operators)))
                      {:operator operator-name})))))

(defmethod apply-step :breakout
  [query {column-name :column}]
  (let [columns (lib/breakoutable-columns query)
        column  (m/find-first #(= (column-display-name query %) column-name) columns)]
    (if (some? column)
      (let [bucket  (m/find-first :default (lib/available-temporal-buckets query column))
            binning (m/find-first :default (lib/available-binning-strategies query column))]
        (lib/breakout query (cond-> column
                              bucket  (lib/with-temporal-bucket bucket)
                              binning (lib/with-binning binning))))
      (throw (ex-info (format "%s is not a correct column for the breakout step. Correct column are: %s"
                              column-name
                              (str/join ", " (map #(column-display-name query %) columns)))
                      {:column column-name})))))

(defmethod apply-step :order_by
  [query {column-name :column}]
  (let [columns (lib/orderable-columns query)
        column  (m/find-first #(= (column-display-name query %) column-name) columns)]
    (if (some? column)
      (lib/order-by query column)
      (throw (ex-info (format "%s is not a correct column for the order_by step. Correct column are: %s"
                              column-name
                              (str/join ", " (map #(column-display-name query %) columns)))
                      {:column column-name})))))

(defmethod apply-step :limit
  [query {:keys [limit]}]
  (if (not (neg-int? limit))
    (lib/limit query limit)
    (throw (ex-info "Row limit must be a non-negative number." {:limit limit}))))

(defn- apply-steps
  [query steps]
  (reduce apply-step query steps))

(mu/defmethod metabot-v3.tools.interface/*invoke-tool* :metabot.tool/run-query
  [_tool-name {:keys [steps]} {:keys [dataset_query]}]
  (let [metadata-provider (lib.metadata.jvm/application-database-metadata-provider (:database dataset_query))
        query             (lib/query metadata-provider dataset_query)]
    (try
      {:reactions [{:type  :metabot.reaction/run-query
                    :query (-> query
                               (apply-steps steps)
                               lib.query/->legacy-MBQL)}]
       :output "success"}
      (catch ExceptionInfo e
        {:output (ex-message e)}))))

(mu/defmethod metabot-v3.tools.interface/*tool-applicable?* :metabot.tool/run-query
  [_tool-name {:keys [dataset_query]}]
  (some? dataset_query))
