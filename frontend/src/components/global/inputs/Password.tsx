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
      <div className='w-full min-w-0 flex border border-stone-500 rounded-sm hover:border-stone-600'>
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          type={showPassword ? 'text' : 'password'}
          {...register(name)}
          className='w-full min-w-0 px-3 bg-white min-h-11 text-base md:text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
        />
        <button
          type='button'
          aria-label={`${showPassword ? 'Ocultar' : 'Mostrar'} ${label}`}
          onClick={togglePasswordVisibility}
          className='min-w-11 min-h-11 shrink-0 flex items-center justify-center bg-backgroundMy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
        >
          {showPassword ? <EyeIcon2 /> : <EyeIcon />}
        </button>
      </div>
      <p
        id={errorId}
        className={`text-red-700 text-sm [overflow-wrap:anywhere] ${error ? '' : 'hidden'}`}
      >
        {typeof error === 'string' ? error : error?.message}
      </p>
    </div>
  );
}

export default InputPassword;
