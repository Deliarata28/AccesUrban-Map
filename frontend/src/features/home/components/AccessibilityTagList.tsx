type AccessibilityTagListProps = {
  tags: string[];
};

export function AccessibilityTagList({ tags }: AccessibilityTagListProps) {
  return (
    <div className="details-tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
