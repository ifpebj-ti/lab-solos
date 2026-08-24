variable "tenancy_ocid" {
  description = "OCID da tenancy OCI."
  type        = string
}

variable "oci_profile" {
  description = "Perfil do arquivo ~/.oci/config."
  type        = string
  default     = "DEFAULT"
}

variable "region" {
  description = "Região OCI do deploy."
  type        = string
  default     = "sa-saopaulo-1"
}

variable "compartment_name" {
  description = "Nome do compartimento isolado do LabOn."
  type        = string
  default     = "labon-prod"
}

variable "admin_cidr" {
  description = "CIDR autorizado a acessar SSH, normalmente o IP público atual com /32."
  type        = string

  validation {
    condition     = can(cidrhost(var.admin_cidr, 0))
    error_message = "admin_cidr deve ser um CIDR válido."
  }
}

variable "ssh_public_key_path" {
  description = "Caminho da chave pública SSH usada na VM."
  type        = string
  default     = "~/.ssh/labon_oci_ed25519.pub"
}

variable "instance_shape" {
  description = "Shape flexível escolhida para o LabOn."
  type        = string
  default     = "VM.Standard.A2.Flex"
}

variable "instance_ocpus" {
  description = "Quantidade de OCPUs da VM."
  type        = number
  default     = 1
}

variable "instance_memory_gbs" {
  description = "Memória da VM em GB."
  type        = number
  default     = 4
}

variable "boot_volume_size_gbs" {
  description = "Tamanho do volume de boot."
  type        = number
  default     = 50
}

variable "app_domain" {
  description = "Domínio público do aplicativo."
  type        = string
  default     = "labon.nmvr.me"
}
