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
        {required && <span className='text-red-700 ml-1'>*</span>}
      </label>
      <input
        id={inputId}
        placeholder={placeholder}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
        className='w-full min-w-0 px-3 bg-white min-h-11 text-base md:text-sm border shadow-sm border-stone-500 rounded-sm hover:border-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
      />
      <p
        id={errorId}
        className={`text-red-700 text-sm [overflow-wrap:anywhere] ${error ? '' : 'hidden'}`}
      >
        {typeof error === 'string' ? error : error?.message}
      </p>
    </div>
  );
}

export default InputText;
