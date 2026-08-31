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
    <div className='w-full flex flex-col gap-1 relative mt-3'>
      <label
        htmlFor={inputId}
        className='font-inter-regular text-sm text-clt-2'
      >
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </label>
      <input
        id={inputId}
        placeholder={placeholder}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(name)}
        className='px-3 bg-white h-9 text-sm border shadow-sm border-borderMy rounded-sm hover:border-gray-400 focus:outline-none focus:border-gray-400'
      />
      <p
        id={errorId}
        className={`text-red-500 text-xs mt-[60px] absolute ${error ? 'visible' : 'invisible'}`}
      >
        {typeof error === 'string' ? error : error?.message}
      </p>
    </div>
  );
}

export default InputText;
