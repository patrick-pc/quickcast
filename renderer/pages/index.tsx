import { useState, useEffect, useRef } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { Copy, Check, Command } from 'react-feather'
import { createParser } from 'eventsource-parser'
import { ipcRenderer } from 'electron'
import { Logo } from '../components/Logo'
import { MemoizedReactMarkdown } from '../components/MemoizedReactMarkDown'
import { Settings } from '../components/Settings'
import { useChatScroll } from '../hooks/useChatScroll'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Head from 'next/head'
import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import TextareaAutosize from 'react-textarea-autosize'

enum Views {
  QUICKCAST = 'QUICKCAST',
  CHATGPT = 'CHATGPT',
  BARD = 'BARD',
}

const INVALID_API_KEY_PROMPT =
  'Invalid API key. You can find yours here at https://platform.openai.com/account/api-keys'

const PREDEFINED_PROMPTS = ['How to make a brewed chai?', 'Get local timezone in TypeScript']

function Home() {
  const [model, setModel] = useLocalStorage('model', 'gpt-3.5-turbo')
  const [prompt, setPrompt] = useLocalStorage(
    'prompt',
    'You are ChatGPT, a large language model trained by OpenAI.'
  )
  const [apiKey, setApiKey] = useLocalStorage('apiKey', '')

  const [message, setMessage] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [conversation, setConversation] = useState([
    {
      role: 'system',
      content: `${prompt} Follow the user's instructions carefully. Respond using markdown.`,
    },
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isContentCopied, setIsContentCopied] = useState(false)
  const [isCodeCopied, setIsCodeCopied] = useState(false)
  const [isBrowserView, setIsBrowserView] = useState(false)
  const [settingsPage, setSettingsPage] = useState(false)
  const [hover, setHover] = useState({})
  const [view, setView] = useState(Views.QUICKCAST)
  const inputRef = useRef(null)
  const conversationRef = useChatScroll(conversation)

  useEffect(() => {
    setConversation([{ role: 'system', content: prompt }])
  }, [prompt])

  useEffect(() => {
    inputRef.current.focus()
    inputRef.current.select()
  }, [settingsPage])

  useEffect(() => {
    ipcRenderer.on('focus', (event, data) => {
      inputRef.current.focus()
      inputRef.current.select()
    })

    ipcRenderer.on('refresh', (event, data) => {
      refreshPage()
    })

    ipcRenderer.on('quickcast-view', (event, data) => {
      setIsBrowserView(false)
      setView(Views.QUICKCAST)

      setTimeout(() => {
        inputRef.current.focus()
        inputRef.current.select()
      })
    })

    ipcRenderer.on('chatgpt-view', (event, data) => {
      setIsBrowserView(true)
      setView(Views.CHATGPT)
    })

    ipcRenderer.on('bard-view', (event, data) => {
      setIsBrowserView(true)
      setView(Views.BARD)
    })

    return () => {
      ipcRenderer.removeAllListeners('focus')
      ipcRenderer.removeAllListeners('refresh')
      ipcRenderer.removeAllListeners('quickcast-view')
      ipcRenderer.removeAllListeners('chatgpt-view')
      ipcRenderer.removeAllListeners('bard-view')
    }
  }, [])

  const sendMessage = async (prompt?: string, regenerate?: boolean) => {
    const trimmedMessage = prompt ? prompt.trim() : message.trim()

    if (!trimmedMessage) return
    if (settingsPage) setSettingsPage(false)

    const oldMessage = message
    const oldConversation = conversation
    const updatedConversation = [
      ...conversation,
      {
        role: 'user',
        content: trimmedMessage,
      },
    ]

    setMessage('')
    setConversation(updatedConversation)
    setLastMessage(oldMessage)
    setIsGenerating(true)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: updatedConversation,
          stream: true,
        }),
      })

      if (response.status === 401) {
        setConversation([
          ...updatedConversation,
          { role: 'assistant', content: INVALID_API_KEY_PROMPT },
        ])

        return
      } else if (response.status !== 200) {
        const { error } = await response.json()
        throw Error(error.message)
      }

      let newMessage = ''
      const parser = createParser((event) => {
        if (event.type === 'event') {
          const data = event.data
          if (data === '[DONE]') {
            return
          }
          const json = JSON.parse(event.data)
          const content = json.choices[0].delta.content

          if (!content) return

          newMessage += content
          setConversation([...updatedConversation, { role: 'assistant', content: newMessage }])
        } else {
          return ''
        }
      })

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        parser.feed(text)
      }
    } catch (error) {
      setConversation([...updatedConversation, { role: 'assistant', content: error.message }])
      setMessage(oldMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    setIsContentCopied(true)
    setTimeout(() => {
      setIsContentCopied(false)
    }, 1500)
  }

  const handleEnterPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'ArrowUp') {
      setMessage(lastMessage)
      setTimeout(() => {
        inputRef.current.select()
      }, 1)
    }
  }

  const handleMouseOver = (index: number) => {
    setHover((c) => {
      return {
        ...c,
        [index]: true,
      }
    })
  }

  const handleMouseOut = (index: number) => {
    setHover((c) => {
      return {
        ...c,
        [index]: false,
      }
    })

    // if (isContentCopied) {
    //   setTimeout(() => {
    //     setHover((c) => {
    //       return {
    //         ...c,
    //         [index]: false,
    //       }
    //     })
    //   }, 800)
    // } else {
    //   setHover((c) => {
    //     return {
    //       ...c,
    //       [index]: false,
    //     }
    //   })
    // }
  }

  const toggleSettingsPage = () => {
    setSettingsPage((c) => !c)
  }

  const refreshPage = () => {
    if (isBrowserView) setIsBrowserView(true)

    setMessage('')
    setSettingsPage(false)
    setConversation([{ role: 'system', content: prompt }])
    inputRef.current.focus()
    inputRef.current.select()
  }

  return (
    <>
      <Head>
        <title>quickcast</title>
      </Head>

      <main className="dark relative flex h-screen w-full flex-col justify-between overflow-hidden px-4 text-[#DDDDDD]">
        <div className="gradient-bg -z-10"></div>
        <div
          className={`absolute left-0 top-20 z-30 h-screen w-full bg-white transition-all ${
            isBrowserView ? 'block' : 'hidden'
          }`}
          onClick={() => setIsBrowserView(false)}
        ></div>

        <div className="relative">
          <div
            className={`absolute right-0.5 top-5 flex select-none items-center gap-1 transition-opacity ${
              isContentCopied || isCodeCopied ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-xs tracking-wide text-[#ADADAD]">Copied to clipboard</p>
          </div>

          <div className="my-3 flex items-center justify-start gap-2 text-xs font-medium text-[#949494]">
            <button
              className={`flex cursor-default select-none items-center justify-center gap-2 rounded-lg px-3 py-1.5 tracking-wide transition hover:bg-black/30 focus:outline-none ${
                view === Views.QUICKCAST ? 'bg-black/30' : 'bg-transparent'
              }`}
              onClick={() => {
                ipcRenderer.send('open-quickcast')
              }}
            >
              <img className="h-4" src="/images/quickcast-logo-fit.svg" />
              QuickCast
            </button>
            <button
              className={`flex cursor-default select-none items-center justify-center gap-2 rounded-lg px-3 py-1.5 tracking-wide transition hover:bg-black/30 focus:outline-none ${
                view === Views.CHATGPT ? 'bg-black/30' : 'bg-transparent'
              }`}
              onClick={() => {
                ipcRenderer.send('open-chatgpt')
                setIsBrowserView(true)
              }}
            >
              <img className="h-4 w-4" src="/images/openai-logo.svg" />
              ChatGPT
            </button>
            <button
              className={`flex cursor-default select-none items-center justify-center gap-2 rounded-lg px-3 py-1.5 tracking-wide transition hover:bg-black/30 focus:outline-none ${
                view === Views.BARD ? 'bg-black/30' : 'bg-transparent'
              }`}
              onClick={() => {
                ipcRenderer.send('open-bard')
                setIsBrowserView(true)
              }}
            >
              <img className="h-4 w-4" src="/images/bard-logo.svg" />
              Bard
            </button>
          </div>
          <div className="relative flex w-full">
            <TextareaAutosize
              className={`z-10 mb-4 w-full rounded-lg bg-black/30 py-4 pl-4 pr-12 text-lg font-light tracking-wider placeholder-[#949494] focus:outline-none [&::-webkit-scrollbar]:hidden`}
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleEnterPress}
              minRows={1}
              maxRows={6}
              ref={inputRef}
            />
          </div>
        </div>

        {!settingsPage ? (
          <div
            className="relative mb-14 flex h-full w-full flex-col overflow-y-auto overflow-x-hidden rounded-lg border-[.5px] border-black/5 bg-black/30 [&::-webkit-scrollbar]:hidden"
            ref={conversationRef}
          >
            {conversation.length > 1 ? (
              <div className="mb-4 tracking-wide">
                {conversation.map((message: { role: string; content: string }, i: number) => {
                  return (
                    <div className="prose dark:prose-invert relative max-w-4xl px-4" key={i}>
                      {message.role !== 'system' &&
                        (message.role === 'user' ? (
                          <p
                            className={`font-light text-[#949494] ${i === 1 ? 'mt-2' : 'mt-4'}`}
                            key={i}
                          >
                            {message.content}
                          </p>
                        ) : (
                          <div
                            className="relative"
                            onMouseOver={() => handleMouseOver(i)}
                            onMouseOut={() => handleMouseOut(i)}
                          >
                            <MemoizedReactMarkdown
                              className="prose dark:prose-invert max-w-4xl"
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeMathjax]}
                              linkTarget="_blank"
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '')

                                  return !inline ? (
                                    <CodeBlock
                                      language={(match && match[1]) || ''}
                                      value={String(children).replace(/\n$/, '')}
                                      isCodeCopied={isCodeCopied}
                                      setIsCodeCopied={setIsCodeCopied}
                                      key={Math.random()}
                                      {...props}
                                    />
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  )
                                },
                                table({ children }) {
                                  return (
                                    <table className="border-collapse border border-white/20 px-3 py-1.5">
                                      {children}
                                    </table>
                                  )
                                },
                                th({ children }) {
                                  return (
                                    <th className="break-words border border-white/20 bg-black/30 px-3 py-1.5">
                                      {children}
                                    </th>
                                  )
                                },
                                td({ children }) {
                                  return (
                                    <td className="break-words border border-white/20 px-3 py-1.5">
                                      {children}
                                    </td>
                                  )
                                },
                              }}
                            >
                              {message.content}
                            </MemoizedReactMarkdown>

                            {message.content === INVALID_API_KEY_PROMPT ? (
                              <button
                                className="cursor-default select-none rounded-[.35rem] bg-[#3D3D3D] px-2 py-0.5 text-sm font-normal text-[#DCDCDC] focus:outline-none"
                                onClick={() => {
                                  setSettingsPage(true)
                                  setConversation([{ role: 'system', content: prompt }])
                                }}
                              >
                                Set Key
                              </button>
                            ) : (
                              <div
                                className={`absolute -bottom-1 right-0 transition-opacity ${
                                  hover[i] ? 'opacity-100' : 'opacity-0'
                                }`}
                              >
                                {!isGenerating && (
                                  <button
                                    className="cursor-default select-none focus:outline-none"
                                    onClick={() => copyContent(message.content)}
                                  >
                                    {/* {isContentCopied ? (
                                      <Check className="text-[#32D74B]" size={18} />
                                    ) : (
                                      <Copy className="text-[#949494]" size={18} />
                                    )} */}
                                    <Copy className="text-[#949494]" size={18} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full w-full select-none flex-col items-center justify-center gap-3 focus:outline-none">
                <img className="h-12 w-12" src="images/smoke.png" alt="smoke" />
                <h2 className="text-xl font-medium tracking-wider text-white">Ask Anything</h2>
                <div className="flex flex-col text-sm font-light text-[#949494]">
                  {PREDEFINED_PROMPTS.map((prompt, i) => {
                    return (
                      <button
                        className="cursor-default rounded px-2 py-0.5 tracking-wide transition hover:bg-white/5"
                        onClick={() => {
                          sendMessage(prompt)
                          inputRef.current.focus()
                          inputRef.current.select()
                        }}
                        key={i}
                      >
                        "{prompt}"
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Settings
            model={model}
            setModel={setModel}
            prompt={prompt}
            setPrompt={setPrompt}
            apiKey={apiKey}
            setApiKey={setApiKey}
            setIsBrowserView={setIsBrowserView}
          />
        )}

        <div className="absolute bottom-0 left-0 flex h-10 w-full items-center justify-between rounded-b-lg border-t-[.5px] border-white/20 px-2">
          <div
            className="flex h-[1.8rem] w-[1.8rem] select-none items-center justify-center gap-1 rounded-lg py-1 text-[#ADADAD] transition hover:bg-black/30 focus:outline-none"
            onClick={toggleSettingsPage}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
              />
            </svg>
          </div>

          <div
            className="flex select-none items-center justify-center gap-1 rounded-lg px-2 py-1 transition hover:bg-black/30 focus:outline-none"
            onClick={refreshPage}
          >
            <p className="mr-1 text-xs text-[#ADADAD]">Clear</p>
            <button className="flex h-5 w-5 cursor-default items-center justify-center rounded-[.35rem] border border-b-2 border-white/20 text-xs text-[#ADADAD] focus:outline-none">
              <Command size={12} />
            </button>
            <button className="flex h-5 w-5 cursor-default items-center justify-center rounded-[.35rem] border border-b-2 border-white/20 text-xs text-[#ADADAD] focus:outline-none">
              R
            </button>
          </div>
        </div>
      </main>
    </>
  )
}

export default Home
