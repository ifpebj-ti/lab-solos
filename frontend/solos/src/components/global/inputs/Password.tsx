import { UseFormRegister, FieldError, FieldValues, Path } from 'react-hook-form';
import EyeIcon2 from '../../../../public/icons/EyeIcon2';
import EyeIcon from '../../../../public/icons/EyeIcon';
import { useState } from 'react';

interface IInputPassword<T extends FieldValues> {
    label: string;
    register: UseFormRegister<T>;
    error?: string | FieldError;
    name: Path<T>;
}

function InputPassword<T extends FieldValues>({ label, register, error, name }: IInputPassword<T>) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div className="w-full flex flex-col gap-1 relative mt-3">
            <label className="font-inter-regular text-sm text-clt-2">{label}</label>
            <div className="w-full flex border border-border rounded-sm hover:border-gray-400 focus:border-gray-400">
                <input
                    type={showPassword ? "text" : "password"}
                    {...register(name)}
                    className="w-full px-3 bg-background h-9 text-sm shadow-sm focus:outline-none"
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="px-4 bg-background h-9 shadow-sm"
                >
                    {showPassword ? <EyeIcon2/> : <EyeIcon/>}
                </button>
            </div>
            <p className={`text-red-500 text-xs mt-[60px] absolute ${error ? 'visible' : 'invisible'}`}>
                {typeof error === 'string' ? error : error?.message}
            </p>
        </div>
    );
}

export default InputPassword;
