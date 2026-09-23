import {
  UseFormRegister,
  FieldError,
  FieldValues,
  Path,
} from 'react-hook-form';
import EyeIcon2 from '../../../../public/icons/EyeIcon2';
import EyeIcon from '../../../../public/icons/EyeIcon';
import { useState } from 'react';

interface IInputPassword<T extends FieldValues> {
  label: string;
  register: UseFormRegister<T>;
  error?: string | FieldError;
  name: Path<T>;
}

function InputPassword<T extends FieldValues>({
  label,
  register,
  error,
  name,
}: IInputPassword<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = String(name);
  const errorId = `${inputId}-error`;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className='w-full min-w-0 flex flex-col gap-1 mt-3'>
      <label
        htmlFor={inputId}
        className='font-inter-regular text-sm text-clt-2'
      >
        {label}
      </label>
      <div className='flex min-h-11 w-full min-w-0 rounded-md border border-borderMy bg-surface hover:border-focus'>
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          type={showPassword ? 'text' : 'password'}
          {...register(name)}
          className='min-h-11 w-full min-w-0 rounded-l-md bg-surface px-3 text-base text-clt-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:text-sm'
        />
        <button
          type='button'
          aria-label={`${showPassword ? 'Ocultar' : 'Mostrar'} ${label}`}
          onClick={togglePasswordVisibility}
          className='flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-r-md bg-backgroundMy text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
        >
          {showPassword ? <EyeIcon2 /> : <EyeIcon />}
        </button>
      </div>
      <p
        id={errorId}
        className={`min-h-5 text-danger text-sm [overflow-wrap:anywhere] ${error ? '' : 'sr-only'}`}
      >
        {typeof error === 'string' ? error : error?.message}
      </p>
    </div>
  );
}

export default InputPassword;
