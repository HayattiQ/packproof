/** A simple horizontal progress stepper for the registration flow. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label="Registration progress">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className={`step step-${state}`}>
            <span className="step-dot" aria-hidden="true">
              {i < current ? "✓" : i + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
