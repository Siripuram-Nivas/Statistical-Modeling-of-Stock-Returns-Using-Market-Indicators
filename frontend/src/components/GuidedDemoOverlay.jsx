import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GUIDED_DEMO_STEPS } from '../guidedDemo';

export default function GuidedDemoOverlay() {
  const {
    guidedDemo,
    activeModule,
    dataset,
    datasetFull,
    descriptive,
    correlation,
    regression,
    setGuidedDemoStep,
    retryGuidedDemo,
    exitGuidedDemo,
  } = useApp();
  const panelRef = useRef(null);
  const [spotlightState, setSpotlightState] = useState({ key: null, bounds: [] });

  const step = GUIDED_DEMO_STEPS[guidedDemo.step];
  const spotlightKey = `${guidedDemo.active}:${guidedDemo.step}:${activeModule}`;
  const spotlights = spotlightState.key === spotlightKey ? spotlightState.bounds : [];
  const isComplete = guidedDemo.step === GUIDED_DEMO_STEPS.length - 1;
  const checks = [
    { label: 'DATA — Validated', done: !!dataset && dataset.quality_summary.errors.length === 0 },
    { label: 'DESCRIPTIVE STATISTICS — Completed', done: !!descriptive },
    { label: 'CORRELATION — Completed', done: !!correlation },
    { label: 'REGRESSION — Completed', done: !!regression?.simple_regression && !!regression?.multiple_regression },
    { label: 'MODEL EVALUATION — Completed', done: !!regression?.multiple_regression?.evaluation },
  ];

  useEffect(() => {
    if (!guidedDemo.active) {
      return undefined;
    }

    const focusedElements = step.targets.flatMap((target) =>
      Array.from(document.querySelectorAll(`[data-guided-demo-target="${target}"]`))
    );

    const updateLayerPositions = () => {
      setSpotlightState({ key: spotlightKey, bounds: focusedElements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        };
      }) });
      if (!focusedElements.length || !panelRef.current) return;
      const focusElement = focusedElements[0];
      const bounds = focusElement.getBoundingClientRect();
      if (window.innerWidth <= 600) {
        Object.assign(panelRef.current.style, {
          top: 'auto',
          right: '1rem',
          bottom: '1rem',
          left: '1rem',
        });
        return;
      }
      const belowTarget = bounds.top < window.innerHeight / 2;
      const oppositeSide = bounds.left + bounds.width / 2 < window.innerWidth / 2;
      Object.assign(panelRef.current.style, {
        top: belowTarget ? 'auto' : '1rem',
        right: oppositeSide ? '1rem' : 'auto',
        bottom: belowTarget ? '1rem' : 'auto',
        left: oppositeSide ? 'auto' : '1rem',
      });
    };

    if (focusedElements.length > 0) {
      focusedElements[0].scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
    const timer = window.setTimeout(updateLayerPositions, 250);
    window.addEventListener('resize', updateLayerPositions);
    window.addEventListener('scroll', updateLayerPositions, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateLayerPositions);
      window.removeEventListener('scroll', updateLayerPositions, true);
    };
  }, [guidedDemo.active, guidedDemo.step, activeModule, spotlightKey, step.targets, dataset, datasetFull, descriptive, correlation, regression]);

  useEffect(() => {
    if (!guidedDemo.active) return undefined;

    const previousFocus = document.activeElement;
    panelRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        exitGuidedDemo();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const controls = panelRef.current.querySelectorAll('button:not(:disabled)');
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [guidedDemo.active, exitGuidedDemo]);

  if (!guidedDemo.active) return null;

  return createPortal(
    <>
      <div className="guided-demo-backdrop" aria-hidden="true" />
      <div className="guided-demo-spotlight-layer" aria-hidden="true">
        {spotlights.map((bounds, index) => (
          <div
            className="guided-demo-spotlight"
            key={`${bounds.top}-${bounds.left}-${index}`}
            style={{
              top: bounds.top - 4,
              left: bounds.left - 4,
              width: bounds.width + 8,
              height: bounds.height + 8,
            }}
          />
        ))}
      </div>
      <aside
        ref={panelRef}
        className="guided-demo-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Guided Demo walkthrough"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className="guided-demo-panel__top">
          <div>
            <div className="guided-demo-badges">
              <span>DEMO MODE</span>
              <span>SYNTHETIC DATA</span>
            </div>
            <div className="guided-demo-panel__eyebrow">GUIDED DEMO</div>
          </div>
          <button
            className="guided-demo-close"
            onClick={() => exitGuidedDemo()}
            aria-label="Exit Guided Demo"
            title="Exit Guided Demo"
          >
            <X size={18} />
          </button>
        </div>

        <div className="guided-demo-progress" aria-label={`Step ${guidedDemo.step + 1} of ${GUIDED_DEMO_STEPS.length}`}>
          <span>Step {guidedDemo.step + 1} of {GUIDED_DEMO_STEPS.length}</span>
          <div className="guided-demo-dots">
            {GUIDED_DEMO_STEPS.map((item, index) => (
              <span
                key={item.title}
                className={index <= guidedDemo.step ? 'guided-demo-dot is-active' : 'guided-demo-dot'}
              />
            ))}
          </div>
        </div>

        <h2>{step.title}</h2>
        <p className="guided-demo-description">{step.description}</p>

        {step.pipeline && (
          <ol className="guided-demo-pipeline">
            {step.pipeline.map((item) => <li key={item}>{item}</li>)}
          </ol>
        )}

        {guidedDemo.active && activeModule !== step.module && (
          <p className="guided-demo-route-note">
            You are viewing another section. Use Previous or Next to return to this walkthrough step.
          </p>
        )}

        {guidedDemo.error && (
          <div className="guided-demo-error" role="alert">
            Could not load the synthetic demo dataset: {guidedDemo.error}
            <button className="guided-demo-retry" onClick={retryGuidedDemo}>Retry</button>
          </div>
        )}

        {isComplete && (
          <div className="guided-demo-completion">
            <h3>Analysis walkthrough complete.</h3>
            <ul>
              {checks.map((item) => (
                <li key={item.label} className={item.done ? 'is-complete' : ''}>
                  <Check size={15} aria-hidden="true" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <p>
              This application demonstrates a complete statistical workflow for analyzing stock returns
              using descriptive statistics, Pearson correlation, and regression.
            </p>
            <div className="guided-demo-actions">
              <button
                className="btn btn-outline"
                onClick={() => setGuidedDemoStep(guidedDemo.step - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="btn btn-primary" onClick={() => exitGuidedDemo('landing')}>
                Explore Dashboard
              </button>
              <button className="btn btn-outline" onClick={() => exitGuidedDemo()}>
                Exit Demo
              </button>
            </div>
          </div>
        )}

        {!isComplete && (
          <div className="guided-demo-actions">
            <button
              className="btn btn-outline"
              onClick={() => setGuidedDemoStep(guidedDemo.step - 1)}
              disabled={guidedDemo.step === 0}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button className="btn btn-primary" onClick={() => setGuidedDemoStep(guidedDemo.step + 1)}>
              Next <ChevronRight size={16} />
            </button>
            <button className="btn btn-outline" onClick={() => exitGuidedDemo()}>
              Exit Demo
            </button>
          </div>
        )}
      </aside>
    </>,
    document.body
  );
}
