import { ipcRenderer } from 'electron'

export const Settings = ({
  model,
  setModel,
  prompt,
  setPrompt,
  apiKey,
  setApiKey,
  setIsBrowserView,
}) => {
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value)
    localStorage.setItem('model', e.target.value)
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    localStorage.setItem('apiKey', e.target.value)
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    localStorage.setItem('prompt', e.target.value)
  }

  return (
    <div className="flex h-full w-full flex-col gap-8 overflow-y-auto overflow-x-hidden rounded-b-xl border-x border-b border-[#676767] bg-[#1F1F1F] p-4 pt-8 text-sm text-[#949494] shadow-lg drop-shadow-lg [&::-webkit-scrollbar]:hidden">
      <div className="flex select-none items-center justify-center gap-2">
        <img className="h-24 w-24" src="images/icon.png" alt="icon" />

        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-[#DCDCDC]">QuickCast</h1>
          <p className="font-medium">0.0.1</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-16">
        <div className="flex w-full select-none items-center justify-center gap-2">
          <label className="flex-1 text-right font-medium">API Model:</label>
          <select
            className="flex-0 w-full max-w-sm rounded border border-[#434343] bg-[#292929] px-1 py-0.5 text-[#DCDCDC] focus:outline-none"
            value={model}
            onChange={handleModelChange}
          >
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4">gpt-4</option>
          </select>
        </div>
        <div className="flex w-full items-center justify-center gap-2">
          <label className="flex-1 select-none text-right font-medium">OpenAI API Key:</label>
          <input
            className="flex-0 w-full max-w-sm rounded border border-[#434343] bg-[#292929] px-2 py-0.5 text-[#DCDCDC] focus:outline-none"
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
          />
        </div>
        <div className="flex w-full items-center justify-center gap-2">
          <label className="flex-1 select-none text-right font-medium">Prompt:</label>
          <textarea
            className="flex-0 w-full max-w-sm rounded border border-[#434343] bg-[#292929] px-2 py-0.5 text-[#DCDCDC] focus:outline-none"
            value={prompt}
            onChange={handlePromptChange}
            rows={2}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 px-16 text-[#ADADAD]">
        <p className="select-none font-medium text-[#DCDCDC] focus:outline-none">
          Made by{' '}
          <a
            className="select-none focus:outline-none"
            href="https://twitter.com/_patrickpc"
            target="_blank"
          >
            Patrick 🫡
          </a>
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            className="cursor-pointer select-none rounded-[.35rem] bg-[#484848] px-2 focus:outline-none"
            onClick={() => {
              ipcRenderer.send('open-chatgpt')
              setIsBrowserView(true)
            }}
          >
            ChatGPT
          </a>
          <a
            className="cursor-pointer select-none rounded-[.35rem] bg-[#484848] px-2 focus:outline-none"
            href="https://twitter.com/_patrickpc"
            target="_blank"
          >
            Feedback
          </a>
          <a
            className="cursor-pointer select-none rounded-[.35rem] bg-[#484848] px-2 focus:outline-none"
            href="https://patrickpc.gumroad.com/l/quickcast"
            target="_blank"
          >
            Donate
          </a>
          <button
            className="cursor-pointer select-none rounded-[.35rem] bg-[#484848] px-2 focus:outline-none"
            onClick={() => ipcRenderer.send('quit')}
          >
            Exit App
          </button>
        </div>
      </div>
    </div>
  )
}
