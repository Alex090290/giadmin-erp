"use client";

import { createContext, useContext, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { FieldValues } from "react-hook-form";
import type { FormViewResult } from "./formView.types";

/** Saved identity the action runs on: always the revision persisted by the form cycle. */
export type FormActionTarget = { id: string; revision: string };
/** Server execution of a named, published action (e.g. `modelAction(model, {action, id, revision})`). */
export type FormActionRunner<TValues extends FieldValues = FieldValues> = (action: string, target: FormActionTarget) => Promise<FormViewResult<TValues>>;

type FormActionsContextValue = {
  /** Header slot rendered by FormView (portal target for FormHeader). */
  header: HTMLElement | null;
  locked: boolean;
  readOnly: boolean;
  /** Labels of the actions the server publishes for this form, when known. */
  actions?: readonly { name: string; label: string }[];
  /** Runs save (if new/dirty) and then the action, under one lock. Resolves true on success. */
  run: ((action: string) => Promise<boolean>) | null;
  /** Which action is running, for its spinner. */
  running: string | null;
};
export const FormActionsContext = createContext<FormActionsContextValue | null>(null);

function useFormActions(component: string) {
  const context = useContext(FormActionsContext);
  if (!context) throw new Error(`${component} se usa dentro de FormView o ModelForm.`);
  return context;
}

/**
 * Puts buttons and the state field in the form header, inside the same RHF context.
 * Children can use useFormContext/useWatch and decide their own visibility.
 */
export function FormHeader({ children }: { children: ReactNode }) {
  const { header, locked, readOnly } = useFormActions("FormHeader");
  return header ? createPortal(<fieldset disabled={locked || readOnly} className="m-0 flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-between gap-2 border-0 p-0 [&_[data-form-widget=statebar]]:ml-auto [&_[data-form-widget=statebar]]:w-auto [&_[data-form-widget=statebar]]:max-w-full">{children}</fieldset>, header) : null;
}

type FormButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "children"> & {
  /** Name of an action published by the model with `@action`; the server validates it. */
  action: string;
  /** Defaults to the published label. */
  children?: ReactNode;
  variant?: "primary" | "secondary";
  /** Hide without unmounting state; use React conditions for business visibility. */
  invisible?: boolean;
};

/**
 * Validates and saves the form first (only if new or modified); on success, runs the
 * named action with the saved ID/revision. One lock covers both phases; a failed save
 * never runs the action, and a failed action keeps what was already saved.
 */
export function FormButton({ action, children, variant = "primary", invisible = false, disabled, className = "", ...props }: FormButtonProps) {
  const { locked, readOnly, actions, run, running } = useFormActions("FormButton");
  const label = children ?? actions?.find(item => item.name === action)?.label ?? action;
  if (invisible || readOnly || !run || (actions && !actions.some(item => item.name === action))) return null;
  return <button {...props} type="button" disabled={disabled || locked}
    className={`btn btn-sm ${variant === "primary" ? "btn-primary" : "btn-soft"} gap-1.5 ${className}`}
    onClick={() => { void run(action); }}>
    {running === action && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
    {label}
  </button>;
}
