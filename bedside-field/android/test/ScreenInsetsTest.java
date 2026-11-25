package app.bedsidefield;

import java.util.Arrays;

/** Plain-JVM checks for ScreenInsets (run by android/build.sh before packaging). */
public final class ScreenInsetsTest {
    private static int failures = 0;

    private static void eq(int[] actual, int[] expected, String what) {
        if (!Arrays.equals(actual, expected)) { failures++; System.out.println("FAIL " + what + ": expected " + Arrays.toString(expected) + ", got " + Arrays.toString(actual)); }
    }

    public static void main(String[] args) {
        eq(ScreenInsets.centred(new int[] { 0, 0, 0, 0 }), new int[] { 0, 0, 0, 0 }, "no cutout");
        eq(ScreenInsets.centred(new int[] { 110, 0, 0, 0 }), new int[] { 110, 0, 110, 0 }, "punch-hole on the left in landscape");
        eq(ScreenInsets.centred(new int[] { 0, 0, 96, 0 }), new int[] { 96, 0, 96, 0 }, "punch-hole on the right in landscape");
        eq(ScreenInsets.centred(new int[] { 0, 80, 0, 0 }), new int[] { 0, 80, 0, 80 }, "notch at the top");
        eq(ScreenInsets.centred(new int[] { 40, 10, 90, 0 }), new int[] { 90, 10, 90, 10 }, "uneven insets");
        if (failures > 0) { System.out.println(failures + " ScreenInsets check(s) failed"); System.exit(1); }
        System.out.println("ScreenInsets: all checks passed");
    }
}
