import {
  Teleport,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'

type ElementRef = {
  value: HTMLElement | null
}

export default defineComponent({
  name: 'DataGridDropdownMenu',
  props: {
    triggerRef: {
      type: Object as PropType<ElementRef>,
      default: undefined,
    },
    teleport: {
      type: Boolean,
      default: false,
    },
    teleportTo: {
      type: String,
      default: 'body',
    },
    menuClass: {
      type: [String, Array] as PropType<string | string[]>,
      default: '',
    },
    scopeAttr: {
      type: String,
      default: '',
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },
    minWidth: {
      type: Number,
      default: 0,
    },
    widthOffset: {
      type: Number,
      default: 0,
    },
    desiredHeight: {
      type: Number,
      default: 0,
    },
    minAvailableHeight: {
      type: Number,
      default: 0,
    },
    chromeHeight: {
      type: Number,
      default: 0,
    },
    minOptionsHeight: {
      type: Number,
      default: 0,
    },
    maxOptionsHeightMin: {
      type: Number,
      default: 0,
    },
    viewportMargin: {
      type: Number,
      default: 12,
    },
    offset: {
      type: Number,
      default: 0,
    },
    zIndex: {
      type: Number,
      default: undefined,
    },
    menuMaxHeightVar: {
      type: String,
      default: '',
    },
    optionsMaxHeightVar: {
      type: String,
      default: '',
    },
    optionsMinHeightVar: {
      type: String,
      default: '',
    },
    outsideClickRootAttr: {
      type: String,
      default: '',
    },
    onOutsidePointerDown: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const positionedStyle = ref<CSSProperties>(
      props.triggerRef
        ? {
            position: 'fixed',
            top: '0',
            left: '0',
            width: props.minWidth > 0 ? `${props.minWidth}px` : undefined,
            ...(props.zIndex === undefined ? {} : { zIndex: props.zIndex }),
          }
        : {},
    )

    function updatePosition() {
      const trigger = props.triggerRef?.value
      if (!trigger) {
        positionedStyle.value = {}
        return
      }

      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = props.viewportMargin
      const width = Math.max(rect.width + props.widthOffset, props.minWidth)
      const left = Math.min(rect.left, viewportWidth - width - margin)
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const openAbove =
        props.desiredHeight > 0 && spaceBelow < props.desiredHeight && spaceAbove > spaceBelow
      const availableSpace = openAbove ? spaceAbove : spaceBelow
      const availableHeight =
        props.minAvailableHeight > 0
          ? Math.max(props.minAvailableHeight, availableSpace - margin)
          : undefined
      const maxOptionsHeight =
        availableHeight === undefined || props.chromeHeight <= 0
          ? undefined
          : Math.max(props.maxOptionsHeightMin, availableHeight - props.chromeHeight)

      positionedStyle.value = {
        position: 'fixed',
        top: openAbove ? 'auto' : `${rect.bottom + props.offset}px`,
        bottom: openAbove ? `${viewportHeight - rect.top + props.offset}px` : 'auto',
        left: `${Math.max(margin, left)}px`,
        width: `${width}px`,
        ...(availableHeight === undefined ? {} : { maxHeight: `${availableHeight}px` }),
        ...(props.zIndex === undefined ? {} : { zIndex: props.zIndex }),
        ...(props.menuMaxHeightVar && availableHeight !== undefined
          ? { [props.menuMaxHeightVar]: `${availableHeight}px` }
          : {}),
        ...(props.optionsMaxHeightVar && maxOptionsHeight !== undefined
          ? { [props.optionsMaxHeightVar]: `${maxOptionsHeight}px` }
          : {}),
        ...(props.optionsMinHeightVar && props.minOptionsHeight > 0
          ? { [props.optionsMinHeightVar]: `${props.minOptionsHeight}px` }
          : {}),
      } as CSSProperties
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (!props.outsideClickRootAttr || !props.onOutsidePointerDown) {
        return
      }

      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest(`[${props.outsideClickRootAttr}="true"]`)) {
        return
      }

      props.onOutsidePointerDown()
    }

    onMounted(() => {
      if (props.triggerRef) {
        void nextTick(updatePosition)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
      }

      if (props.outsideClickRootAttr && props.onOutsidePointerDown) {
        document.addEventListener('pointerdown', handleDocumentPointerDown)
      }
    })

    onBeforeUnmount(() => {
      if (props.triggerRef) {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }

      if (props.outsideClickRootAttr && props.onOutsidePointerDown) {
        document.removeEventListener('pointerdown', handleDocumentPointerDown)
      }
    })

    watch(
      () => [
        props.triggerRef?.value,
        props.minWidth,
        props.widthOffset,
        props.desiredHeight,
        props.minAvailableHeight,
        props.chromeHeight,
        props.minOptionsHeight,
        props.maxOptionsHeightMin,
        props.viewportMargin,
        props.offset,
        props.zIndex,
      ],
      () => void nextTick(updatePosition),
      { flush: 'post' },
    )

    return () => {
      const menu = (
        <div
        class={props.menuClass}
        style={[positionedStyle.value, props.style]}
        {...(props.scopeAttr ? { [props.scopeAttr]: 'true' } : {})}
        onClick={(event) => event.stopPropagation()}
      >
        {slots.default?.()}
      </div>
      )

      return props.teleport ? <Teleport to={props.teleportTo}>{menu}</Teleport> : menu
    }
  },
})
