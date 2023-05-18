import { FC, memo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { darcula } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Check, Clipboard } from 'react-feather'

interface Props {
  language: string
  value: string
  isCodeCopied: boolean
  setIsCodeCopied: any
}

export const CodeBlock: FC<Props> = memo(({ language, value, isCodeCopied, setIsCodeCopied }) => {
  const copyCode = (content: string) => {
    navigator.clipboard.writeText(content)
    setIsCodeCopied(true)
    setTimeout(() => {
      setIsCodeCopied(false)
    }, 1500)
  }

  return (
    <div className="codeblock relative overflow-hidden text-sm">
      <button
        className="absolute right-0 top-0 cursor-default select-none rounded-lg p-1.5 focus:outline-none"
        onMouseUp={() => {
          copyCode(value)
        }}
      >
        <Clipboard className="text-[#949494]" size={18} />
      </button>

      <SyntaxHighlighter
        language={language}
        style={darcula}
        customStyle={{
          margin: 0,
          backgroundColor: 'rgba(255, 255, 255, .1)',
          overflow: 'hidden',
          // borderRadius: '0 0 .5rem .5rem',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'
