//------------ IBNIZ-BASED INTERPRETER ------------


IBNIZ = function(z){ // Limited IBNIZ style player

    sk = [t] // stack
    rsk= [t] // rstack
    skl= sk.length
    
        for(var ixa=0; ixa<z.length; ixa++) {
    
                     if(z[ixa]=='d') {
                sk.push(sk[skl-1])
            } else if(z[ixa]=='p') {
                sk.pop()
            } else if(z[ixa]=='x') {
                var temp= sk[skl-1]
                sk[skl-1] = sk[skl-2]
                sk[skl-2] = temp
            } else if(z[ixa]=='v') {
                var temp = sk[skl-3]
                sk[skl-3] = sk[skl-2]
                sk[skl-2] = sk[skl-1]
                sk[skl-1] = temp
            } else if(z[ixa]=='P') {
                rsk.push(sk.pop())
            } else if(z[ixa]=='R') {
                sk.push(rsk.pop())
            } else if(z[ixa]=='w') {
                sk.push(t)
            } else if(z[ixa]=='@') {
                sk.push(a)
            } else if(z[ixa]=='#') {
                sk.push(b)
            } else if(z[ixa]=='$') {
                sk.push(c)
            } 
    
              else if(z[ixa]=='+') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa+tempb)
            } else if(z[ixa]=='-') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa-tempb)
            } else if(z[ixa]=='*') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa*tempb)
            }  else if(z[ixa]=='/') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa/tempb)
            }  else if(z[ixa]=='%') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa%tempb)
            }  else if(z[ixa]=='&') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa&tempb)
            }  else if(z[ixa]=='|') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa|tempb)
            }  else if(z[ixa]=='^') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa^tempb)
            }  else if(z[ixa]=='r') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa>>tempb)
            }  else if(z[ixa]=='l') {
                tempb=sk.pop()
                tempa=sk.pop()
                sk.push(tempa<<tempb)
            }
    
    
              else if(z[ixa]=='~') {
                sk.push(~sk.pop())
            } else if(z[ixa]=='<') {
                sk.push(temp=sk.pop(),temp<0?0:temp)
            } else if(z[ixa]=='>') {
                sk.push(temp=sk.pop(),temp<0?0:temp)
            } else if(z[ixa]=='=') {
                sk.push(temp=sk.pop(),temp==0?1:0)
            } else if(z[ixa]=='q') {
                sk.push(sqrt(sk.pop()))
            } else if(z[ixa]=='s') {
                sk.push(sin(sk.pop()))
            } else if(z[ixa]=='a') {
                sk.push(atan2(sk.pop()))
            } else if(z[ixa]=='1') {
                sk.push(1)
            } else if(z[ixa]=='2') {
                sk.push(2)
            } else if(z[ixa]=='3') {
                sk.push(3)
            } else if(z[ixa]=='4') {
                sk.push(4)
            } else if(z[ixa]=='5') {
                sk.push(5)
            } else if(z[ixa]=='6') {
                sk.push(6)
            } else if(z[ixa]=='7') {
                sk.push(7)
            } else if(z[ixa]=='8') {
                sk.push(8)
            } else if(z[ixa]=='9') {
                sk.push(9)
            } else if(z[ixa]=='A') {
                sk.push(10)
            } else if(z[ixa]=='B') {
                sk.push(11)
            } else if(z[ixa]=='C') {
                sk.push(12)
            } else if(z[ixa]=='D') {
                sk.push(13)
            } else if(z[ixa]=='E') {
                sk.push(14)
            } else if(z[ixa]=='F') {
                sk.push(15)
            } else if(z[ixa]=='T') {
                sk.push(z[ixa+1]*10000 + z[ixa+2]*1000 + z[ixa+3]*100 + z[ixa+4]*10 + z[ixa+5]*1)
                ixa+=5
            } else if(z[ixa]=='M') {
                sk.push(sk.pop()*100000)
            }
    
    
        }
    
        return sk.pop()
    },
    
    //------------ SONG SETUP ------------
    
    a=null,
    b=null,
    c=null,
    
    // + - * / % & | ^ l d p x v P R < = > are as in IBNIZ
    
    // r is shift right instead of rotate right
    
    // single hex digits are each an item on the stack, even without seperation.
    // A 5 digit decimal number can be input using TXXXXX, where XXXXX is the decimal number. It must be 5 digits and must be 
    // decimal, so you can't use something like `T362`, you must use `T00362`. other examples: `T00005`, `T04096`.
    
    // M multiplies the top number on the stack by 100,000. (Works really well with T to create simulated 10, 15, 20, etc.
    // digit numbers.)
    
    // @, #, and $ push the a,b,and c variables respectively.
    
    // Other symbols do nothing.
    
    //------------ SONG ------------
    
    IBNIZ("ddAr&/T00256*")
