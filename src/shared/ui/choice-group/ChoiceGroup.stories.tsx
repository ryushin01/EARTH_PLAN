import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChoiceGroup } from './ChoiceGroup'

function Demo() {
  const [value, setValue] = useState<'low' | 'mid' | 'high'>('mid')
  return (
    <ChoiceGroup
      legend="배출 시나리오"
      value={value}
      onChange={setValue}
      columns={3}
      choices={[
        { value: 'low', label: '저배출', hint: 'SSP1-2.6' },
        { value: 'mid', label: '중간', hint: 'SSP2-4.5' },
        { value: 'high', label: '고배출', hint: 'SSP5-8.5' },
      ]}
    />
  )
}

const meta = { title: 'shared/ChoiceGroup', component: Demo } satisfies Meta<
  typeof Demo
>
export default meta
export const Default: StoryObj<typeof meta> = {}
