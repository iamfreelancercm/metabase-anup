// We prefix misc data keys we add to avoid possible collisions with series data keys
export const NULL_CHAR = "\0";

// On stacked charts we show labels with the total value of stacks that are grouped by sign
export const POSITIVE_STACK_TOTAL_DATA_KEY = `${NULL_CHAR}_positiveStackTotal`;
export const NEGATIVE_STACK_TOTAL_DATA_KEY = `${NULL_CHAR}_negativeStackTotal`;

// Key of x-axis values
export const X_AXIS_DATA_KEY = `${NULL_CHAR}_x`;

export const TREND_LINE_DATA_KEY = `${NULL_CHAR}_trend`;

// For ticks we want to pick the largest interval that exist 3 times in the range.
// For example, if data has week granularity but the range is more than 3 months, we want to show monthly ticks.
export const TICKS_INTERVAL_THRESHOLD = 3;

// ECharts replaces null valeus with empty strings which makes it impossible
// to distinguish between null and empty string so we have to use another special value for nulls.
export const ECHARTS_CATEGORY_AXIS_NULL_VALUE = `${NULL_CHAR}_NULL`;
