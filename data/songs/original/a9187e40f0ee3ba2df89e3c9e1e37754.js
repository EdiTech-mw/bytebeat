//bd    tone                        << seq <<          seq speed       vol
(((0x480%(t&2047)&99)*((0b01000001000000010000000100000001>>(t>>11))&1))/3+
//hh
((t%25^t%214)&28)*((0b01010101110101010101010101010101>>(t>>11))&1)/8+
//sd
((t%81^t%104)&64)*((0b10010000000100000001000000010000>>(t>>11))&1))*6/
//common envelope
(1+(t>>7&15))