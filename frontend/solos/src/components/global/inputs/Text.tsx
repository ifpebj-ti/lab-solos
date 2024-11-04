import { UseFormRegister, FieldError } from 'react-hook-form';

interface LoginFormData {
    email: string;
    password: string;
}
interface IInputText {
    label: string,
    type: string,
    register: UseFormRegister<LoginFormData>;
    error?: string | FieldError;
    name: keyof LoginFormData;
}

function InputText({ label, type, register, error, name }: IInputText) {
    return (
        <div className="w-full flex flex-col gap-1 relative mt-3">
            <label className="font-inter-regular text-sm text-clt-2">{label}</label>
            <input
                type={type}
                {...register(name)}
                className="px-3 bg-background h-9 text-sm border shadow-sm border-border rounded-sm hover:border-gray-400 focus:outline-none focus:border-gray-400"
            />
            <p className={`text-red-500 text-xs mt-[60px] absolute ${error ? 'visible' : 'invisible'}`}>
                {String(error || '')}
            </p>
        </div>
    );
}


export default InputText;