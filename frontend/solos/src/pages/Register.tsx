import Carousel from "../components/global/Carousel";

function Register() {
    const items = ['Card 1', 'Card 2', 'Card 3', 'Card 4', 'Card 5'];
    return (
        <div className="flex justify-start flex-row w-full h-screen">
            <Carousel items={items}/>
        </div>
    )
}

export default Register;