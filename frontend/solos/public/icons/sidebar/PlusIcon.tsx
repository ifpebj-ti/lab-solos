import React from "react";
interface IPlusIcon {
    fill?: string;
}

export default function PlusIcon({ fill = "#fff" }: IPlusIcon) {
    return (
        <svg width="23" height="23" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.3334 20H26.6667M20 13.3333V26.6666M36.6667 20C36.6667 29.2047 29.2048 36.6666 20 36.6666C10.7953 36.6666 3.33337 29.2047 3.33337 20C3.33337 10.7952 10.7953 3.33331 20 3.33331C29.2048 3.33331 36.6667 10.7952 36.6667 20Z" stroke={fill} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
