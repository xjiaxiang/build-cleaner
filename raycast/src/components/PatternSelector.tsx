import { List, Icon } from "@raycast/api";

interface PatternSelectorProps {
  selectedPatterns: string[];
}

export function PatternSelector({ selectedPatterns }: PatternSelectorProps) {
  return (
    <List.Section title="Cleanup Patterns">
      {selectedPatterns.map(pattern => {
        return (
          <List.Item
            id={`pattern-${pattern}`}
            key={pattern}
            title={pattern}
            icon={Icon.CheckCircle}
          />
        );
      })}
    </List.Section>
  );
}
