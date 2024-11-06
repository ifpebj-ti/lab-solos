"use client"
import * as React from "react"
import SearchIcon from "../../public/icons/SearchIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import UpDownIcon from '../../public/icons/UpDownIcon';
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
 
const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
]
 

function Register() {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    return (
        <div className="h-full w-full flex justify-start items-center flex-col overflow-y-auto">
            <div className="w-11/12 flex items-center justify-between mt-7">
                <h1 className="uppercase font-rajdhani-medium text-3xl text-clt-2">Cadastro de Bens</h1>
                <div className="flex items-center justify-between">
                    <button className="border border-borderMy rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200">
                        <SearchIcon fill="#232323" />
                    </button>
                </div>
            </div>
            <div>s</div>
            <Select>
                <SelectTrigger className="w-[180px] border border-borderMy rounded-md text-clt-2 font-inter-regular">
                    <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent className="border border-borderMy rounded-md font-inter-regular">
                    <SelectItem className="hover:bg-cl-table-item font-inter-regular" value="light">Light</SelectItem>
                    <SelectItem className="hover:bg-cl-table-item font-inter-regular" value="dark">Dark</SelectItem>
                    <SelectItem className="hover:bg-cl-table-item font-inter-regular" value="system">System</SelectItem>
                </SelectContent>
            </Select>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild >
                    <button
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between flex h-9 rounded-sm items-center px-3 border border-borderMy font-inter-regular text-sm text-clt-2"
                    >
                    {value
                        ? frameworks.find((framework) => framework.value === value)?.label
                        : "Clique e selecione..."}
                    <UpDownIcon />
                    </button>
                </PopoverTrigger>
                <PopoverContent className=" p-0">
                    <Command className="border border-borderMy">
                    <CommandInput placeholder="Pesquisar" className="h-9 font-inter-regular" />
                    <CommandList>
                        <CommandEmpty>Nenhum Mentor encontrado</CommandEmpty>
                        <CommandGroup>
                        {frameworks.map((framework) => (
                            <CommandItem
                            className="font-inter-regular text-clt-2"
                            key={framework.value}
                            value={framework.value}
                            onSelect={(currentValue) => {
                                setValue(currentValue === value ? "" : currentValue)
                                setOpen(false)
                            }}
                            >
                            {framework.label}
                            <Check className={cn("ml-auto", value === framework.value ? "opacity-100" : "opacity-0")}/>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default Register;