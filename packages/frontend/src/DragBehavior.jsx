import { useRef } from 'react';
import { useDrag } from '@use-gesture/react'


export default function DragBehavior(props) {
  const nodeRef = useRef();
  const valueAtDragStartRef = useRef(props.value || 0);

  const {snapToMouseLinearHorizontal, value, onChange, children, ...other} = props;

  const bindDragHandlers = useDrag((state) => {
    if (state.first && typeof value === 'number') {
      valueAtDragStartRef.current = value;

      if (snapToMouseLinearHorizontal) {
        const [x] = state.xy;
        const posInScreen = nodeRef.current.getBoundingClientRect();

        const dx = x - posInScreen.left;
        const dv = dx / posInScreen.width;

        valueAtDragStartRef.current = Math.max(0, Math.min(1, dv));

        if (typeof onChange === 'function') {
          onChange(Math.max(0, Math.min(1, dv)));
        }
      }

      return;
    }

    const [dx, dy] = state.movement;
    const dv = (dx - dy) / 200;

    if (typeof onChange === 'function') {
      onChange(Math.max(0, Math.min(1, valueAtDragStartRef.current + dv)));
    }
  });

  return (
    <div ref={nodeRef} className="touch-none" {...bindDragHandlers()} {...other}>
      {children}
    </div>
  );
}
