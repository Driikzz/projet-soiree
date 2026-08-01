import { WarningCircle } from "@phosphor-icons/react";

interface FormErrorProps {
  message: string | undefined;
}

export function FormError({ message }: FormErrorProps) {
  if (message === undefined) {
    return null;
  }

  return (
    <p className="form-error" role="alert">
      <WarningCircle aria-hidden="true" weight="fill" />
      {message}
    </p>
  );
}
