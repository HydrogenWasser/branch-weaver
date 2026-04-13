import type { NodeSearchResult } from "../lib/search";

type SearchPanelProps = {
  query: string;
  resultCount: number;
  totalCount: number;
  results: NodeSearchResult[];
  onQueryChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
};

export default function SearchPanel({
  query,
  resultCount,
  totalCount,
  results,
  onQueryChange,
  onSelectNode
}: SearchPanelProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <h2>Search</h2>
        <span className="panel__meta">
          {resultCount}/{totalCount}
        </span>
      </div>

      <label className="field">
        <span>Find in titles, body text, and choices</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search story graph"
        />
      </label>

      {query.trim() ? (
        results.length > 0 ? (
          <div className="search-result-list">
            {results.map((result) => (
              <button
                key={result.nodeId}
                type="button"
                className="search-result"
                onClick={() => onSelectNode(result.nodeId)}
              >
                <strong>{result.title || "Untitled Node"}</strong>
                <span>{result.locationLabel}</span>
                <p>{result.excerpt}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="search-panel__empty">No nodes match this query.</p>
        )
      ) : (
        <p className="search-panel__empty">Type to highlight and jump to matching nodes.</p>
      )}
    </div>
  );
}
