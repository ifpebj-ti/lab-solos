import SearchIcon from "../../public/icons/SearchIcon";

function Register() {
    return (
        <div className="h-full w-full flex justify-start items-center flex-col overflow-y-auto">
            <div className="w-11/12 flex items-center justify-between mt-7">
                <h1 className="uppercase font-rajdhani-medium text-3xl text-clt-2">Cadastro de Bens</h1>
                <div className="flex items-center justify-between">
                    <button className="border-[1px] border-border rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200">
                        <SearchIcon fill="#232323" />
                    </button>
                </div>
            </div>
            <div>s</div>
            
        </div>
    )
}

export default Register;