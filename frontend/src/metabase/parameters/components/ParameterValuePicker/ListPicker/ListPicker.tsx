import { useCallback, useRef } from "react";
import { useUnmount } from "react-use";

import { useDebouncedCallback } from "metabase/hooks/use-debounced-callback";
import { Select, Loader } from "metabase/ui";

import { PickerIcon } from "../ParameterValuePicker.styled";
import { blurOnCommitKey } from "../util";

import S from "./ListPicker.css";

interface ListPickerProps {
  value: string;
  values: string[];
  onChange: (value: string) => void;
  onClear: () => void;
  onSearchChange?: (query: string) => void;
  /** Omit the prop or pass -1 if you want to disable it */
  searchDebounceMs?: number;
  onDropdownOpen?: () => void;
  enableSearch: boolean;
  isLoading: boolean;
  noResultsText: string;
  placeholder: string;
  errorMessage?: string;
}

// TODO show "remove" button when typing, static list parameters (metabase#40226)
export function ListPicker(props: ListPickerProps) {
  const {
    value,
    values,
    onChange,
    onClear,
    onSearchChange = noop,
    searchDebounceMs = -1,
    onDropdownOpen,
    enableSearch,
    placeholder,
    noResultsText,
    isLoading,
    errorMessage,
  } = props;

  const icon = isLoading ? (
    <div data-testid="listpicker-loader">
      <Loader size="xs" />
    </div>
  ) : value ? (
    <PickerIcon name="close" onClick={onClear} />
  ) : null;

  const debouncedOnSearch = useDebouncedCallback(
    (query: string) => {
      searches.current.pending = null;
      onSearchChange(query);
    },
    searchDebounceMs,
    [onSearchChange],
  );

  // For some reason Select is firing multiple onSearchChange events, which isn't needed.
  const searches = useRef<{ last: string | null; pending: string | null }>({
    last: null,
    pending: null,
  });
  const singleOnSearch = useCallback(
    (search: string) => {
      if (search !== searches.current.last) {
        searches.current.last = search;
        if (searchDebounceMs === -1) {
          onSearchChange(search);
        } else {
          searches.current.pending = search;
          debouncedOnSearch(search);
        }
      }
    },
    [onSearchChange, debouncedOnSearch, searchDebounceMs],
  );

  useUnmount(() => {
    if (searches.current.pending) {
      onSearchChange(searches.current.pending);
    }
    debouncedOnSearch.cancel();
  });

  return (
    <Select
      // This is required until we fix the Select to support maxDropdownHeight
      classNames={{ dropdown: S.dropdown }}
      error={errorMessage}
      value={value}
      data={values}
      onChange={onChange}
      rightSection={icon}
      placeholder={placeholder}
      searchable={enableSearch}
      onKeyUp={blurOnCommitKey}
      nothingFound={noResultsText}
      onSearchChange={singleOnSearch}
      onDropdownOpen={onDropdownOpen}
      inputWrapperOrder={["label", "input", "error", "description"]}
    />
  );
}

function noop() {}
