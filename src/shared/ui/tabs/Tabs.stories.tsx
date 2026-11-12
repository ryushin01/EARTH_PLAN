import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs } from './Tabs'

const items = [
  { id: 'sea', label: '해수면', content: <p>해수면 패널</p> },
  { id: 'volcano', label: '화산', content: <p>화산 패널</p> },
  { id: 'tsunami', label: '쓰나미', content: <p>쓰나미 패널</p> },
]

function Demo() {
  const [value, setValue] = useState('sea')
  return (
    <Tabs label="제어 항목" items={items} value={value} onChange={setValue} />
  )
}

const meta = { title: 'shared/Tabs', component: Demo } satisfies Meta<
  typeof Demo
>
export default meta
export const Default: StoryObj<typeof meta> = {}
