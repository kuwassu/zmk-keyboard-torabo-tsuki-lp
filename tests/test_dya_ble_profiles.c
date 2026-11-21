/* Verify the generated DYA RPC schema can round-trip all seven host profiles.
 * Compile with the actual generated ble_management.pb.c and nanopb sources.
 */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <pb_decode.h>
#include <pb_encode.h>
#include <zmk/ble_management/ble_management.pb.h>

int main(void) {
    zmk_ble_management_GetProfilesResponse original =
        zmk_ble_management_GetProfilesResponse_init_zero;
    assert(sizeof(original.profiles) / sizeof(original.profiles[0]) >= 7);
    original.max_profiles = 7;
    original.profiles_count = 7;
    for (unsigned int i = 0; i < 7; i++) {
        original.profiles[i].index = i;
        snprintf(original.profiles[i].name, sizeof(original.profiles[i].name), "Host %u", i);
        original.profiles[i].is_active = i == 6;
    }

    uint8_t buffer[2048];
    pb_ostream_t output = pb_ostream_from_buffer(buffer, sizeof(buffer));
    assert(pb_encode(&output, zmk_ble_management_GetProfilesResponse_fields, &original));

    zmk_ble_management_GetProfilesResponse restored =
        zmk_ble_management_GetProfilesResponse_init_zero;
    pb_istream_t input = pb_istream_from_buffer(buffer, output.bytes_written);
    assert(pb_decode(&input, zmk_ble_management_GetProfilesResponse_fields, &restored));
    assert(restored.max_profiles == 7 && restored.profiles_count == 7);
    for (unsigned int i = 0; i < 7; i++) {
        assert(restored.profiles[i].index == i);
        assert(strcmp(restored.profiles[i].name, original.profiles[i].name) == 0);
        assert(restored.profiles[i].is_active == (i == 6));
    }
    puts("PASS: all seven DYA BLE profiles encode/decode, including active slot 6");
    return 0;
}
