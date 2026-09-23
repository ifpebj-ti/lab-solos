import {
  UseFormRegister,
  FieldError,
  FieldValues,
  Path,
} from 'react-hook-form';

interface IInputText<T extends FieldValues> {
  label: string;
  type: string;
  register: UseFormRegister<T>;
  error?: string | FieldError;
  name: Path<T>;
  placeholder?: string;
  required?: boolean;
}

function InputText<T extends FieldValues>({
  label,
  type,
  register,
  error,
  name,
  placeholder,
  required = false,
}: IInputText<T>) {
  const inputId = String(name);
  const errorId = `${inputId}-error`;

  return (
    <div className='w-full min-w-0 flex flex-col gap-1 mt-3'>
      <label
        htmlFor={inputId}
        className='font-inter-regular text-sm text-clt-2'
      >
        {label}
        {required && <span className='ml-1 text-danger'>*</span>}
      </label>
      <input
        id={inputId}
        placeholder={placeholder}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
        className='min-h-11 w-full min-w-0 rounded-md border border-borderMy bg-surface px-3 text-base text-clt-2 shadow-sm hover:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:text-sm'
      />
      <p
        id={errorId}
        className={`min-h-5 text-danger text-sm [overflow-wrap:anywhere] ${error ? '' : 'sr-only'}`}
      >
        {typeof error === 'string' ? error : error?.message}
      </p>
    </div>
  );
}

export default InputText;
