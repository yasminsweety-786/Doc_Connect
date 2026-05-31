import java.util.Scanner;
public class evenFibSum {
    public Static Void  main(String[] args){
        Scanner sc = new Scanner (System.in);
        System.out.println("enter the number");
        int N = sc.nextINT(); 
        int first =0, second =1, sum =0;
        while (N>=first){
            if ( first % 2 == 0){
                sum +=first;
            }
            int next = first + second;
            first = second ;
             second = next ;
            
        }
         System.out.println("Sum of Even Fibonacci is "+ sum);
    }
    
}
