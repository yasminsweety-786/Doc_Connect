import java.util
import java.util.HashSet;*;
class HashDemo
{
    public static void main(String args[])
    {
        HashSet<String> set=new HashSet<>();
        set.add(10);
        set.add(20);
        set.add(10);
        
        System.out.println(set);
        System.out.println("Values by iteation ::");
        for(Integer i:set)
        {
            System.out.println(i);
            set.remove(20);
        }
    }
}