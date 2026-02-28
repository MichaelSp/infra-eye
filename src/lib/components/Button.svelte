<script lang="ts">
import { Button as FBButton } from "flowbite-svelte"
import type { HTMLButtonAttributes } from "svelte/elements"

interface Props {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "xs" | "sm" | "md" | "lg"
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
  [key: string]: any
}

let {
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  ...restProps
}: Props = $props()

// Map local variants to Flowbite colors/props
const color = $derived(
  variant === "primary"
    ? "primary"
    : variant === "secondary"
      ? "secondary"
      : variant === "danger"
        ? "red"
        : "alternative"
)
</script>

<FBButton
  color={color}
  size={size}
  loading={loading}
  disabled={disabled}
  class={(fullWidth ? 'w-full ' : '') + className}
  {...restProps}
>
  <slot />
</FBButton>
