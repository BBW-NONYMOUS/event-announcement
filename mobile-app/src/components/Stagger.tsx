// Staggered entrance for list items.
//
// Reanimated rather than a stagger package: `entering` runs the animation on the
// UI thread, so a list that is still fetching or scrolling cannot jank it.
import type { ReactNode } from "react";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

/** Per-item delay. Long enough to read as a cascade, short enough that the
 *  last card in a screenful isn't left waiting. */
const STEP_MS = 60;

/** Beyond this the cascade stops being a flourish and starts being a wait, so
 *  later items all share the final delay. */
const MAX_STEPS = 6;

export function Stagger({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  // Respect the OS "reduce motion" switch: a cascade of sliding cards is
  // exactly the vestibular trigger that setting exists to turn off.
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return <Animated.View>{children}</Animated.View>;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, MAX_STEPS) * STEP_MS)
        .duration(320)
        .springify()
        .damping(18)}
    >
      {children}
    </Animated.View>
  );
}
