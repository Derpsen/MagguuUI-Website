export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    button: {
      defaultVariants: {
        size: 'md',
      },
    },
    input: {
      slots: {
        root: 'w-full',
      },
    },
    modal: {
      slots: {
        overlay: 'bg-black/50',
        content: 'rounded-xl shadow-xl border border-[var(--admin-border)]',
      },
    },
    badge: {
      defaultVariants: {
        size: 'sm',
      },
    },
  },
})
