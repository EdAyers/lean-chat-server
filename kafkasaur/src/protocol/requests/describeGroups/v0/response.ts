import {Decoder} from '../../../decoder.ts'
import { failure, createErrorFromCode } from '../../../error.ts'

/**
 * DescribeGroups Response (Version: 0) => [groups]
 *   groups => error_code group_id state protocol_type protocol [members]
 *     error_code => INT16
 *     group_id => STRING
 *     state => STRING
 *     protocol_type => STRING
 *     protocol => STRING
 *     members => member_id client_id client_host member_metadata member_assignment
 *       member_id => STRING
 *       client_id => STRING
 *       client_host => STRING
 *       member_metadata => BYTES
 *       member_assignment => BYTES
 */

const decoderMember = (decoder: any) => ({
  memberId: decoder.readString(),
  clientId: decoder.readString(),
  clientHost: decoder.readString(),
  memberMetadata: decoder.readBytes(),
  memberAssignment: decoder.readBytes()
})

const decodeGroup = (decoder: any) => ({
  errorCode: decoder.readInt16(),
  groupId: decoder.readString(),
  state: decoder.readString(),
  protocolType: decoder.readString(),
  protocol: decoder.readString(),
  members: decoder.readArray(decoderMember)
})
//deno-lint-ignore require-await
const decode = async (rawData: any) => {
  const decoder = new Decoder(rawData)
  const groups = decoder.readArray(decodeGroup)

  return {
    groups,
  }
}
//deno-lint-ignore require-await
const parse = async (data: any) => {
  const groupsWithError = data.groups.filter(({
    errorCode
  }: any) => failure(errorCode))
  if (groupsWithError.length > 0) {
    throw createErrorFromCode(groupsWithError[0].errorCode)
  }

  return data
}

export default {
  decode,
  parse,
}