import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectField } from './SelectField'

function Demo() {
  const [value, setValue] = useState('fuji')
  return (
    <SelectField
      label="화산"
      value={value}
      onChange={setValue}
      options={[
        { value: 'fuji', label: '후지산', group: '아시아' },
        { value: 'baekdu', label: '백두산', group: '아시아' },
        { value: 'vesuvius', label: '베수비오', group: '유럽' },
      ]}
    />
  )
}

const meta = { title: 'shared/SelectField', component: Demo } satisfies Meta<
  typeof Demo
>
export default meta
export const Default: StoryObj<typeof meta> = {}
