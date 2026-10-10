import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Tailwind height class for the editor box */
  heightClass?: string;
};

/**
 * Side-by-side markdown editor and live preview.
 * Controlled: the parent owns the content state.
 */
export default function ContentEditor({
  value,
  onChange,
  placeholder = "Write markdown here...",
  heightClass = "h-96",
}: ContentEditorProps) {
  return (
    <div
      className={`grid grid-cols-2 overflow-hidden rounded border border-gray-400 ${heightClass}`}
    >
      {/* Editor */}
      <div className="flex flex-col border-r border-gray-300">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-400">
          Editor
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Markdown editor"
          className="flex-1 resize-none p-3 font-mono text-sm focus:outline-none"
        />
      </div>

      {/* Preview */}
      <div className="flex flex-col">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-400">
          Preview
        </div>
        <div className="markdown-preview flex-1 overflow-y-auto p-3 text-sm">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs text-gray-400">Preview will appear here...</p>
          )}
        </div>
      </div>
    </div>
  );
}
