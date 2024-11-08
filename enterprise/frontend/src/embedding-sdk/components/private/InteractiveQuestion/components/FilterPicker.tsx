import cx from "classnames";

import { FilterPicker as InnerFilterPicker } from "metabase/querying/filters/components/FilterPicker";
import { Box } from "metabase/ui";
import * as Lib from "metabase-lib";

import { useInteractiveQuestionContext } from "../context";

import S from "./FilterPicker.module.css";

interface Props {
  className?: string;
  withIcon?: boolean;
}

export const FilterPicker = ({ className, withIcon = false }: Props) => {
  const { question, updateQuestion } = useInteractiveQuestionContext();

  const query = question?.query();

  if (!query) {
    return null;
  }

  return (
    <Box className={cx(S.PickerContainer, className)}>
      <InnerFilterPicker
        query={query}
        stageIndex={-1}
        columnPickerProps={{
          withCustomExpression: false,
          withColumnGroupIcon: false,
          withColumnItemIcon: withIcon,
        }}
        onSelect={filter => {
          const nextQuery = Lib.filter(query, -1, filter);

          if (question) {
            updateQuestion(question.setQuery(nextQuery), { run: true });
          }
        }}
      />
    </Box>
  );
};
