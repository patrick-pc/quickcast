import { FC, memo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Clipboard } from 'react-feather'

interface Props {
  language: string
  value: string
}

export const CodeBlock: FC<Props> = memo(({ language, value }) => {
  return (
    <div className="codeblock relative text-sm">
      <div className="flex items-center justify-between rounded-t-lg bg-[#1B1B1B] px-4 py-2">
        <span className="font-sans text-xs lowercase text-white">{language}</span>
        <button onMouseUp={() => navigator.clipboard.writeText(value)}>
          <Clipboard size={18} />
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        wrapLines={true}
        customStyle={{ margin: 0, borderRadius: '0 0 .5rem .5rem' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
})
