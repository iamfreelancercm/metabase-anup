import type { ReactNode } from "react";
import { useState } from "react";
import { t } from "ttag";

import { Tooltip } from "metabase/ui";
// FIXME: seeing if importing directly from Mantine removes the problem
import { Popover } from "@mantine/core";
import * as Lib from "metabase-lib";

import { AggregationPicker } from "../SummarizeSidebar.styled";

import { AddAggregationButtonRoot } from "./AddAggregationButton.styled";

interface AddAggregationButtonProps {
  query: Lib.Query;
  stageIndex: number;
  onQueryChange: (query: Lib.Query) => void;
}

export function AddAggregationButton({
  query,
  stageIndex,
  onQueryChange,
}: AddAggregationButtonProps) {
  const [isOpened, setIsOpened] = useState(false);
  const hasAggregations = Lib.aggregations(query, stageIndex).length > 0;
  const operators = Lib.availableAggregationOperators(query, stageIndex);

  const renderTooltip = (children: ReactNode) =>
    hasAggregations ? (
      <Tooltip label={t`Add a function or metric`}>{children}</Tooltip>
    ) : (
      children
    );

  return (
    <Popover opened={isOpened} onChange={setIsOpened}>
      <Popover.Target>
        {renderTooltip(
          <AddAggregationButtonRoot
            icon="add"
            borderless
            onlyIcon={hasAggregations}
            onClick={() => setIsOpened(!isOpened)}
            aria-label={t`Add aggregation`}
            data-testid="add-aggregation-button"
          >
            {hasAggregations ? null : t`Add a function or metric`}
          </AddAggregationButtonRoot>,
        )}
      </Popover.Target>
      <Popover.Dropdown>
        this popover dropdown isn't getting its top and left set properly
        <AggregationPicker
          query={query}
          stageIndex={stageIndex}
          operators={operators}
          allowTemporalComparisons
          onQueryChange={query => {
            onQueryChange(query);
            setIsOpened(false);
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
