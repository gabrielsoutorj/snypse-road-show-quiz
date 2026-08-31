import type { OptionLabel } from '../domain/session'
import type { QuestionOption } from '../domain/build-two'

type Props = {
  options: QuestionOption[]
  selected?: OptionLabel | OptionLabel[] | null
  disabled?: boolean
  interactive?: boolean
  onSelect?: (label: OptionLabel) => void
  screen?: boolean
}

export function QuestionOptions({
  options,
  selected = null,
  disabled = false,
  interactive = false,
  onSelect,
  screen = false,
}: Props) {
  return (
    <div className={`question-options-grid ${screen ? 'question-options-screen' : ''}`}>
      {options.map((option) => {
        const isSelected = Array.isArray(selected)
          ? selected.includes(option.label)
          : selected === option.label
        return (
          <button
            key={option.id}
            type="button"
            className={`question-option question-option-${option.label.toLowerCase()} ${
              isSelected ? 'question-option-selected' : ''
            }`}
            disabled={!interactive || disabled}
            onClick={() => onSelect?.(option.label)}
            aria-pressed={interactive ? isSelected : undefined}
          >
            <span className="question-option-label">{option.label}</span>
            <span className="question-option-text">{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}
