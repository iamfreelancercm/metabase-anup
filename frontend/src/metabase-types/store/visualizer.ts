import type {
  Card,
  Dataset,
  DatasetColumn,
  VisualizationDisplay,
  VisualizationSettings,
} from "metabase-types/api";

export type VisualizerDataSourceType = "card";
export type VisualizerDataSourceId = `${VisualizerDataSourceType}:${number}`;

export type VisualizerDataSource = {
  id: VisualizerDataSourceId;
  sourceId: number;
  type: VisualizerDataSourceType;
  name: string;
};

export type VisualizerReferencedColumn = {
  sourceId: VisualizerDataSourceId;
  columnKey: string; // in original dataset
  name: string; // in combined dataset
};

export type VisualizerDatasetColumn = DatasetColumn & {
  values: string[];
  source: "artificial";
};

type BaseDraggedItem<T> = {
  id: string;
  data: {
    current: T;
  };
};

export type DraggedColumn = BaseDraggedItem<{
  type: "COLUMN";
  column: DatasetColumn;
  dataSource: VisualizerDataSource;
}>;

export type DraggedVizSettingColumn = BaseDraggedItem<{
  type: "VIZ_SETTING_COLUMN";
  column: DatasetColumn;

  // string[] for nested settings like:
  // ["pivot_table.column_split", "rows"]
  vizSettingKey: string | string[];
}>;

export type DraggedItem = DraggedColumn | DraggedVizSettingColumn;

export interface VisualizerState {
  display: VisualizationDisplay | null;
  columns: VisualizerDatasetColumn[];
  referencedColumns: VisualizerReferencedColumn[];
  settings: VisualizationSettings;
  cards: Card[];
  datasets: Record<VisualizerDataSourceId, Dataset>;
  expandedDataSources: Record<VisualizerDataSourceId, boolean>;
  loadingDataSources: Record<VisualizerDataSourceId, boolean>;
  loadingDatasets: Record<VisualizerDataSourceId, boolean>;
  error: string | null;
  draggedItem: DraggedItem | null;
}
