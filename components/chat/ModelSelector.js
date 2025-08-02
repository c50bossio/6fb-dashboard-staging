'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

const models = [
  // OpenAI Models
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai', description: 'Most capable OpenAI model' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai', description: 'Advanced reasoning' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'Fast and efficient' },
  
  // Anthropic Models
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', description: 'Latest Claude model' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', description: 'Fast Claude model' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Most capable Claude' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', description: 'Balanced Claude model' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', description: 'Fastest Claude model' },
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
                  selected.provider === 'openai' ? 'bg-green-400' : 'bg-purple-400'
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
                            model.provider === 'openai' ? 'bg-green-400' : 'bg-purple-400'
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