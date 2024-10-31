import { ReactNode } from "react"

interface ContainerI {
    children: ReactNode;
}

function Container({ children } : ContainerI) {
    return (
        <section className="overflow-auto w-full">
            { children }
        </section>
    )
}

export default Container;