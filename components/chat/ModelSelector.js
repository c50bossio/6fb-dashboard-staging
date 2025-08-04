'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

const models = [
  // OpenAI Models (Latest 2 Generations)
  { id: 'o3', name: 'OpenAI o3', provider: 'openai', description: 'Smartest reasoning model - pushes frontier in coding, math, science (Jan 2025)' },
  { id: 'o4-mini', name: 'OpenAI o4-mini', provider: 'openai', description: 'Fast, cost-efficient reasoning model - best on AIME 2024/2025' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', description: 'Specialized model that excels at coding tasks (2025)' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', description: 'Fast, capable model - significant improvements over GPT-4o mini' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Latest multimodal GPT-4 (Dec 2024)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast and affordable GPT-4o' },
  
  // Anthropic Models (Latest 2 Generations)
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'anthropic', description: 'Most advanced Claude model with superior reasoning and analysis (May 2025)' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Enhanced coding excellence - improved on Claude 3.7 across all areas (May 2025)' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'anthropic', description: 'First hybrid reasoning model - can think step-by-step or give instant responses (Feb 2025)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet V2', provider: 'anthropic', description: 'Enhanced Claude 3.5 with improved capabilities (Oct 2024)' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', description: 'Fastest Claude 3.5 model' },
  
  // Google Gemini Models (Latest 2 Generations)  
  { id: 'gemini-2.5-pro-exp', name: 'Gemini 2.5 Pro Experimental', provider: 'google', description: 'Most advanced Gemini - thinking model with enhanced reasoning (2025)' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'google', description: 'Latest Gemini 2.0 experimental (Dec 2024)' },
  { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002', provider: 'google', description: 'Enhanced Gemini 1.5 Pro (Nov 2024)' },
  { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002', provider: 'google', description: 'Latest fast Gemini model (Nov 2024)' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function ModelSelector({ selectedModel, onModelChange }) {
  const selected = models.find(m => m.id === selectedModel) || models[0]

  const handleChange = (model) => {
    onModelChange({
      model: model.id,
      provider: model.provider
    })
  }

  return (
    <Listbox value={selected} onChange={handleChange}>
      {({ open }) => (
        <>
          <Listbox.Label className="block text-sm font-medium text-gray-700">AI Model</Listbox.Label>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
              <div className="flex items-center">
                <span className={classNames(
                  'inline-block h-2 w-2 flex-shrink-0 rounded-full',
                  selected.provider === 'openai' ? 'bg-green-400' : 
                  selected.provider === 'anthropic' ? 'bg-purple-400' : 
                  selected.provider === 'google' ? 'bg-blue-400' : 'bg-gray-400'
                )} />
                <span className="ml-3 block truncate">{selected.name}</span>
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {models.map((model) => (
                  <Listbox.Option
                    key={model.id}
                    className={({ active }) =>
                      classNames(
                        active ? 'text-white bg-indigo-600' : 'text-gray-900',
                        'relative cursor-default select-none py-2 pl-3 pr-9'
                      )
                    }
                    value={model}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center">
                          <span className={classNames(
                            'inline-block h-2 w-2 flex-shrink-0 rounded-full',
                            model.provider === 'openai' ? 'bg-green-400' : 
                            model.provider === 'anthropic' ? 'bg-purple-400' : 
                            model.provider === 'google' ? 'bg-blue-400' : 'bg-gray-400'
                          )} />
                          <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}>
                            {model.name}
                          </span>
                        </div>
                        <span className={classNames(active ? 'text-indigo-200' : 'text-gray-500', 'ml-5 text-xs')}>
                          {model.description}
                        </span>

                        {selected ? (
                          <span
                            className={classNames(
                              active ? 'text-white' : 'text-indigo-600',
                              'absolute inset-y-0 right-0 flex items-center pr-4'
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  )
}