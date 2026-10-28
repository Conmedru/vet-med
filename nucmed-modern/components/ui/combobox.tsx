"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

/**
 * Комбобокс с поиском по большому списку (специальности, страны, города).
 * Построен на CommandPrimitive (уже используется в SearchDialog) + Popover —
 * без Radix Select, у которого нет встроенного поиска по вводу.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Выберите значение",
  searchPlaceholder = "Поиск...",
  emptyText = "Ничего не найдено",
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "input w-full justify-between font-normal h-[38px]",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface FreeTextComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}

/**
 * Автодополнение по свободному текстовому полю (страна/город): в отличие
 * от Combobox выше, значение не обязано совпадать с одним из вариантов —
 * список из ТЗ городов/стран неполный, и врач должен быть волен ввести свой.
 */
export function FreeTextCombobox({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: FreeTextComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [typed, setTyped] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // При фокусе показываем все варианты (без фильтра по текущему значению),
  // фильтруем только когда пользователь реально вводит текст.
  const filtered = React.useMemo(() => {
    if (!typed) return suggestions.slice(0, 200)
    const q = value.trim().toLowerCase()
    if (!q) return suggestions.slice(0, 200)
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 200)
  }, [value, suggestions, typed])

  return (
    <Popover open={open && filtered.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <input
          ref={inputRef}
          className={cn("input", className)}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value)
            setTyped(true)
            setOpen(true)
          }}
          onFocus={() => {
            setTyped(false)
            setOpen(true)
            // Выделяем весь текст — пользователь может сразу начать вводить
            requestAnimationFrame(() => inputRef.current?.select())
          }}
          onBlur={() => {
            // Небольшая задержка чтобы клик по опции успел сработать
            setTimeout(() => setOpen(false), 150)
          }}
          autoComplete="off"
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1 max-h-64 overflow-y-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        {filtered.map((item, idx) => (
          <button
            key={`${item}-${idx}`}
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-muted"
            onMouseDown={(e) => {
              e.preventDefault() // не даёт blur уйти с input до клика
              onChange(item)
              setOpen(false)
              setTyped(false)
            }}
          >
            {item}
          </button>
        ))}
        {typed && filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Нажмите Enter, чтобы использовать введённое значение
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
