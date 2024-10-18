(ns metabase.util.namespaces
  "Potemkin is Java-only, so here's a basic function-importing macro that works for both CLJS and CLJ."
  (:require
   [metabase.plugins.classloader :as classloader]
   #_{:clj-kondo/ignore [:discouraged-namespace]}
   [metabase.util.jvm :as u.jvm]
   [metabase.util.log :as log]
   [net.cgrand.macrovich :as macros]
   [potemkin :as p]))

(set! *warn-on-reflection* true)

(defn- redef [target sym]
  (let [defn-name (or sym (symbol (name target)))]
    `(def ~defn-name "docstring" (fn [& args#] (apply ~target args#)))))

(defmacro import-fn
  "Imports a single defn from another namespace.
  This creates a new local function that calls through to the original, so that it reloads nicely in the REPL.
  `(import-fn ns/b)          => (defn b [& args] (apply ns/b args))`
  `(import-fn ns/b alt-name) => (defn alt-name [& args] (apply ns/b args))`"
  ;; Heavily inspired by Potemkin.
  ([target]
   `(import-fn ~target nil))
  ([target sym]
   (redef target sym)))

(defmacro import-fns
  "Imports defns from other namespaces.
  This uses [[import-fn]] to create pass-through local functions that reload nicely.
  `(import-fns [ns1 f1 f2 f3] [ns2 f4 f5])` creates `f1` that calls `ns1/f1`, `f2` that calls `ns1/f2`, etc.
  If you need to rename a function, instead of just the function name, pass `[original new-name]`."
  {:style/indent [:form]}
  [& spaces]
  (macros/case
    :cljs `(do
             ~@(for [[target-ns & fns] spaces
                     f                 fns
                     :let [target-sym (if (vector? f) (first f)  f)
                           new-sym    (if (vector? f) (second f) f)
                           target     (symbol (name target-ns) (name target-sym))]]
                 (redef target new-sym)))
    :clj  `(p/import-vars ~@spaces)))

(defn find-and-load-namespaces!
  "Find and load all sub-namespaces of `root-ns` that are part of the Metabase channel system."
  [root-ns]
  (assert (string? root-ns) "root-ns must be a string")
  (doseq [ns-symb u.jvm/metabase-namespace-symbols
          :when   (.startsWith (name ns-symb) root-ns)]
    (log/infof "Loading namespace: %s" ns-symb)
    (classloader/require ns-symb)))
