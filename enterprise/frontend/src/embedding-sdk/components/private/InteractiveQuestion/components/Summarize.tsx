import { useRef, useState } from "react";
import { t } from "ttag";

import { AggregationPicker as BaseAggregationPicker } from "metabase/common/components/AggregationPicker";
import CS from "metabase/css/core/index.css";
import { RemoveIcon } from "metabase/query_builder/components/view/sidebars/SummarizeSidebar/AggregationItem/AggregationItem.styled";
import { useSummarizeQuery } from "metabase/query_builder/components/view/sidebars/SummarizeSidebar/SummarizeContent";
import { Button, Group, Icon, ScrollArea, Stack } from "metabase/ui";
import * as Lib from "metabase-lib";
import type Question from "metabase-lib/v1/Question";

import { useInteractiveQuestionContext } from "../context";

type SummarizeProps = {
  onClose: () => void;
};

export const Summarize = ({ onClose = () => {} }: Partial<SummarizeProps>) => {
  const { question } = useInteractiveQuestionContext();

  return question && <SummarizeInner question={question} onClose={onClose} />;
};

const SummarizeInnerItem = ({
  query,
  stageIndex,
  aggregation,
  aggregationIndex,
  onQueryChange,
}: {
  query: Lib.Query;
  stageIndex: number;
  aggregation?: Lib.AggregationClause;
  aggregationIndex?: number;
  onQueryChange: (query: Lib.Query) => void;
}) => {
  const operators = Lib.selectedAggregationOperators(
    Lib.availableAggregationOperators(query, stageIndex),
    aggregation,
  );

  return (
    <BaseAggregationPicker
      query={query}
      stageIndex={stageIndex}
      clause={aggregation}
      clauseIndex={aggregationIndex}
      operators={operators}
      allowTemporalComparisons
      onQueryChange={onQueryChange}
    />
  );
};

const SummarizeInner = ({
  question,
  onClose,
}: {
  question: Question;
} & SummarizeProps) => {
  const { updateQuestion } = useInteractiveQuestionContext();

  const onQueryChange = (query: Lib.Query) =>
    updateQuestion(question.setQuery(query), { run: true });

  // save initial question in case we close without making changes
  const initialQuestion = useRef(question.query());

  const [currentQuery, setCurrentQuery] = useState<Lib.Query>(question.query());

  const { query, stageIndex, aggregations, handleQueryChange } =
    useSummarizeQuery({
      query: currentQuery,
      onQueryChange: setCurrentQuery,
    });

  const onApplyFilter = () => {
    if (query) {
      onQueryChange(currentQuery);
      onClose();
    }
  };

  const onCloseFilter = () => {
    if (initialQuestion.current) {
      onQueryChange(initialQuestion.current);
    }
    onClose();
  };

  const [currentAggregation, setCurrentAggregation] = useState<{
    aggregation?: Lib.AggregationClause;
    aggregationIndex?: number;
  }>({
    aggregation: undefined,
    aggregationIndex: undefined,
  });

  return (
    <Stack className={CS.overflowHidden} h="100%">
      <Stack spacing="xs">
        {aggregations.map((aggregation, aggregationIndex) => {
          const { displayName } = Lib.displayInfo(
            query,
            stageIndex,
            aggregation,
          );

          const handleRemove = () => {
            const nextQuery = Lib.removeClause(query, stageIndex, aggregation);
            handleQueryChange(nextQuery);
          };
          return (
            <Group key={displayName}>
              <Button
                variant={
                  aggregationIndex === currentAggregation.aggregationIndex
                    ? "filled"
                    : "default"
                }
                fullWidth
                compact
                rightIcon={<RemoveIcon name="close" onClick={handleRemove} />}
                onClick={() =>
                  currentAggregation.aggregationIndex === aggregationIndex
                    ? setCurrentAggregation({
                        aggregation: undefined,
                        aggregationIndex: undefined,
                      })
                    : setCurrentAggregation({
                        aggregation,
                        aggregationIndex,
                      })
                }
              >
                {displayName}
              </Button>
            </Group>
          );
        })}
        <Button
          variant={
            currentAggregation.aggregationIndex === undefined &&
            !currentAggregation.aggregation
              ? "filled"
              : "default"
          }
          onClick={() => {
            setCurrentAggregation({
              aggregation: undefined,
              aggregationIndex: undefined,
            });
          }}
          rightIcon={<Icon name="add" />}
        />
      </Stack>

      <ScrollArea h="100%">
        <SummarizeInnerItem
          query={query}
          stageIndex={stageIndex}
          aggregation={currentAggregation.aggregation}
          aggregationIndex={currentAggregation.aggregationIndex}
          onQueryChange={handleQueryChange}
        />
      </ScrollArea>

      <Group>
        <Button variant="filled" onClick={onApplyFilter}>
          {t`Apply`}
        </Button>
        <Button variant="subtle" color="text-medium" onClick={onCloseFilter}>
          {t`Close`}
        </Button>
      </Group>
    </Stack>
  );
};
