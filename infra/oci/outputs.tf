output "compartment_id" {
  description = "OCID do compartimento do LabOn."
  value       = oci_identity_compartment.labon.id
}

output "instance_id" {
  description = "OCID da instância do LabOn."
  value       = oci_core_instance.labon.id
}

output "public_ip" {
  description = "IPv4 público para o registro A labon.nmvr.me."
  value       = oci_core_instance.labon.public_ip
}

output "dns_record" {
  description = "Registro a criar na Namecheap."
  value = {
    type  = "A"
    host  = "labon"
    value = oci_core_instance.labon.public_ip
    ttl   = "Automatic"
  }
}

output "ssh_command" {
  description = "Comando SSH para administrar a VM."
  value       = "ssh -i ~/.ssh/labon_oci_ed25519 ubuntu@${oci_core_instance.labon.public_ip}"
}
