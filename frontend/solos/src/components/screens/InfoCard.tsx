import React from 'react';

interface IInfoCardProps {
  icon: React.ReactNode;
  text: string;
  notify: boolean;
}

function InfoCard({ icon, text, notify }: IInfoCardProps) {
    const notifyProp = notify;

    return (
        <div className="relative w-1/4 gap-x-4 h-full border-border border-[1px] rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200">
            {icon}
            <p className="font-inter-medium uppercase text-clt-2 text-sm">{text}</p>

            {/* Bolinha vermelha para notificação */}
            {notifyProp && (
                <span className="absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
        </div>
    );
};

export default InfoCard;
