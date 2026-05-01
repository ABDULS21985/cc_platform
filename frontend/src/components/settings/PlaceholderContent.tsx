'use client';

interface PlaceholderContentProps {
  title: string;
  description: string;
}

export function PlaceholderContent({
  title,
  description,
}: PlaceholderContentProps) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
